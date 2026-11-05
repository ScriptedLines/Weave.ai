import os

import torch






def select_device(device='', batch_size=0):
    cpu = device == 'cpu'
    if not cpu and torch.cuda.is_available():
        arg = f'cuda:{device}'
    else:
        arg = 'cpu'

    return arg


def get_ckpt(ckpt_path):
    ckpt = torch.load(ckpt_path, map_location='cpu',weights_only=False) if ckpt_path else None
    return ckpt


def load_ckpt(model, ckpt=None):
    if ckpt is not None:
        ckpt_new = model.state_dict()
        pretrained = ckpt.get('model') if ckpt.get('model') else ckpt
        for param in ckpt_new:
            ckpt_new[param] = pretrained[param]
        model.load_state_dict(ckpt_new)


def smart_optimizer(model, name='Adam', lr=0.001, momentum=0.9):
    params = [p for p in model.parameters()]

    if name == 'Adam':
        optimizer = torch.optim.Adam(params, lr=lr, betas=(momentum, 0.999))
    elif name == 'AdamW':
        optimizer = torch.optim.AdamW(params, lr=lr, betas=(momentum, 0.999), weight_decay=0.0)
    elif name == 'RMSProp':
        optimizer = torch.optim.RMSprop(params, lr=lr, momentum=momentum)
    elif name == 'SGD':
        optimizer = torch.optim.SGD(params, lr=lr, momentum=momentum, nesterov=True)
    else:
        raise NotImplementedError(f'Optimizer {name} not implemented.')

    return optimizer


def smart_resume(ckpt, optimizer, ckpt_path, epoch_num):
    best_fid = float('inf')
    start_epoch = ckpt.get('epoch') + 1 if  ckpt.get('epoch') else 1
    if ckpt.get('optimizer') is not None:
        optimizer.load_state_dict(ckpt['optimizer'])
        if ckpt.get('best_fid') is not None:
            best_fid = ckpt['best_fid']
    print(f'Resume training from {ckpt_path} from epoch {start_epoch} to {epoch_num} total epochs')

    return start_epoch, best_fid
